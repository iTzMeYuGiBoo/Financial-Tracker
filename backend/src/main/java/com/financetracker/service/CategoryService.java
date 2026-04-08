package com.financetracker.service;
import com.financetracker.dto.CategoryRequest;
import com.financetracker.entity.Category;
import com.financetracker.exception.*;
import com.financetracker.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {
    private final CategoryRepository repo; private final UserService userService;
    public List<Map<String,Object>> getAll(){return repo.findByUserOrderByTypeAscNameAsc(userService.getCurrentUser()).stream().map(this::build).toList();}
    @Transactional
    public Map<String,Object> create(CategoryRequest req){
        var u=userService.getCurrentUser();
        if(repo.existsByNameAndUser(req.getName(),u)) throw new BadRequestException("Category already exists");
        var c=Category.builder().name(req.getName()).icon(req.getIcon()).color(req.getColor()).type(Category.CategoryType.valueOf(req.getType())).user(u).build();
        return build(repo.save(c));
    }
    @Transactional
    public void delete(Long id){var u=userService.getCurrentUser();var c=repo.findById(id).filter(x->x.getUser().getId().equals(u.getId())).orElseThrow(()->new ResourceNotFoundException("Not found"));repo.delete(c);}
    private Map<String,Object> build(Category c){return Map.of("id",c.getId(),"name",c.getName(),"icon",c.getIcon(),"color",c.getColor(),"type",c.getType().name());}
}
